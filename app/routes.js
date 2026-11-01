const { ObjectId } = require('mongodb')

module.exports = function(app, passport, db) {

    // Helpers
    const statuses = [
        'Considering',
        'Decided',
        'Revisited'
    ]

    const categories = [
        'Career',
        'Business',
        'Money',
        'Relationships',
        'Health',
        'Personal Growth',
        'Other'
    ]

    function cleanText(value, maxLength = 150) {
        return typeof value === 'string'
            ? value.trim().slice(0, maxLength)
            : ''
    }

    function decisionFields(body) {
        return {
            title: cleanText(body.title),
            category: categories.includes(body.category)
                ? body.category
                : 'Other',
            description: cleanText(body.description, 2000),
            status: statuses.includes(body.status)
                ? body.status
                : 'Considering',
            updatedAt: new Date()
        }
    }

    // HOME
    app.get('/', function(req, res) {
        res.render('index.ejs')
    })

    // DECISION ROOM
    app.get('/profile', isLoggedIn, async function(req, res) {
        try {
            const decisions = await db.collection('decisions')
                .find({ ownerId: String(req.user._id) })
                .sort({ createdAt: -1 })
                .toArray()

            res.render('profile.ejs', {
                user: req.user,
                decisions: decisions
            })
        } catch (error) {
            console.error('Dashboard error:', error)
            res.status(500).send('Unable to load Decision Room.')
        }
    })

    // CREATES A DECISION
    app.post('/decisions', isLoggedIn, async function(req, res) {
        try {
            const decision = decisionFields(req.body)

            if (!decision.title) {
                return res.status(400).send('Decision title is required.')
            }

            await db.collection('decisions').insertOne({
                ...decision,
                ownerId: String(req.user._id),
                createdAt: new Date()
            })

            res.redirect('/profile')
        } catch (error) {
            console.error('Create decision error:', error)
            res.status(500).send('Unable to create decision.')
        }
    })

    // UPDATES A DECISION
    app.post('/decisions/:id/update', isLoggedIn, async function(req, res) {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).send('Invalid decision ID.')
            }

            const decision = decisionFields(req.body)

            if (!decision.title) {
                return res.status(400).send('Decision title is required.')
            }

            const result = await db.collection('decisions').updateOne(
                {
                    _id: new ObjectId(req.params.id),
                    ownerId: String(req.user._id)
                },
                {
                    $set: decision
                }
            )

            if (!result.matchedCount) {
                return res.status(404).send('Decision not found.')
            }

            res.redirect('/profile')
        } catch (error) {
            console.error('Update decision error:', error)
            res.status(500).send('Unable to update decision.')
        }
    })

    // DELETES A DECISION
    app.post('/decisions/:id/delete', isLoggedIn, async function(req, res) {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).send('Invalid decision ID.')
            }

            const result = await db.collection('decisions').deleteOne({
                _id: new ObjectId(req.params.id),
                ownerId: String(req.user._id)
            })

            if (!result.deletedCount) {
                return res.status(404).send('Decision not found.')
            }

            res.redirect('/profile')
        } catch (error) {
            console.error('Delete decision error:', error)
            res.status(500).send('Unable to delete decision.')
        }
    })

    // LOGOUT (updated this after encountering an issue --> this ensures the redirect happens after the logout operation is complete + it forwards any error to Express)
    app.get('/logout', function(req, res, next) {
        req.logout(function(err) {
            if (err) {
                return next(err)
            }
            res.redirect('/')
        })
    })

    // LOGIN
    app.get('/login', function(req, res) {
        res.render('login.ejs', {
            message: req.flash('loginMessage')
        })
    })

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }))

    // SIGNUP
    app.get('/signup', function(req, res) {
        res.render('signup.ejs', {
            message: req.flash('signupMessage')
        })
    })

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile',
        failureRedirect: '/signup',
        failureFlash: true
    }))
}
// Authentication middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}